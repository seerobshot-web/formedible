/**
 * Safe arithmetic expression evaluator for personality scoring formulas.
 *
 * Deliberately does NOT use eval()/new Function(). Supports:
 *   + - * / ^ (power), unary minus, parentheses
 *   variables (trait keys, e.g. `openness`)
 *   function calls: min(a, b, ...), max(a, b, ...), round(x), abs(x)
 *
 * Example: "(openness * 1.5 - neuroticism) / max(total, 1)"
 */

type TokenType = "number" | "ident" | "op" | "lparen" | "rparen" | "comma";

interface Token {
  type: TokenType;
  value: string;
}

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
  round: (a) => Math.round(a),
  abs: (a) => Math.abs(a),
  floor: (a) => Math.floor(a),
  ceil: (a) => Math.ceil(a),
};

export class ExpressionError extends Error {}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      tokens.push({ type: "number", value: expr.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < expr.length && /[a-zA-Z0-9_]/.test(expr[j])) j++;
      tokens.push({ type: "ident", value: expr.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/^".includes(c)) {
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ type: "lparen", value: c });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "rparen", value: c });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ type: "comma", value: c });
      i++;
      continue;
    }
    throw new ExpressionError(`Unexpected character "${c}" in expression`);
  }
  return tokens;
}

/** Recursive-descent parser producing a closure-based evaluator. */
class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(type?: TokenType): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new ExpressionError("Unexpected end of expression");
    if (type && t.type !== type) {
      throw new ExpressionError(`Expected ${type} but got ${t.type}`);
    }
    this.pos++;
    return t;
  }

  parse(vars: Record<string, number>): number {
    const value = this.parseAddSub(vars);
    if (this.pos !== this.tokens.length) {
      throw new ExpressionError("Unexpected trailing tokens in expression");
    }
    return value;
  }

  private parseAddSub(vars: Record<string, number>): number {
    let value = this.parseMulDiv(vars);
    while (this.peek()?.type === "op" && (this.peek()!.value === "+" || this.peek()!.value === "-")) {
      const op = this.consume().value;
      const rhs = this.parseMulDiv(vars);
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  private parseMulDiv(vars: Record<string, number>): number {
    let value = this.parsePow(vars);
    while (this.peek()?.type === "op" && (this.peek()!.value === "*" || this.peek()!.value === "/")) {
      const op = this.consume().value;
      const rhs = this.parsePow(vars);
      if (op === "/") {
        value = rhs === 0 ? 0 : value / rhs;
      } else {
        value = value * rhs;
      }
    }
    return value;
  }

  private parsePow(vars: Record<string, number>): number {
    const base = this.parseUnary(vars);
    if (this.peek()?.type === "op" && this.peek()!.value === "^") {
      this.consume();
      const exp = this.parsePow(vars);
      return Math.pow(base, exp);
    }
    return base;
  }

  private parseUnary(vars: Record<string, number>): number {
    if (this.peek()?.type === "op" && this.peek()!.value === "-") {
      this.consume();
      return -this.parseUnary(vars);
    }
    if (this.peek()?.type === "op" && this.peek()!.value === "+") {
      this.consume();
      return this.parseUnary(vars);
    }
    return this.parsePrimary(vars);
  }

  private parsePrimary(vars: Record<string, number>): number {
    const t = this.peek();
    if (!t) throw new ExpressionError("Unexpected end of expression");

    if (t.type === "number") {
      this.consume();
      return parseFloat(t.value);
    }

    if (t.type === "lparen") {
      this.consume();
      const value = this.parseAddSub(vars);
      this.consume("rparen");
      return value;
    }

    if (t.type === "ident") {
      this.consume();
      if (this.peek()?.type === "lparen") {
        this.consume("lparen");
        const args: number[] = [];
        if (this.peek()?.type !== "rparen") {
          args.push(this.parseAddSub(vars));
          while (this.peek()?.type === "comma") {
            this.consume();
            args.push(this.parseAddSub(vars));
          }
        }
        this.consume("rparen");
        const fn = FUNCTIONS[t.value];
        if (!fn) throw new ExpressionError(`Unknown function "${t.value}"`);
        return fn(...args);
      }
      if (!(t.value in vars)) {
        throw new ExpressionError(`Unknown variable "${t.value}"`);
      }
      return vars[t.value];
    }

    throw new ExpressionError(`Unexpected token "${t.value}"`);
  }
}

/**
 * Evaluate a scoring expression against a set of trait variables.
 * Returns 0 (and logs a warning) if the expression is invalid rather than
 * throwing, so a typo in one profile never breaks the whole scoring run.
 */
export function evaluateExpression(
  expression: string,
  vars: Record<string, number>
): number {
  try {
    const tokens = tokenize(expression);
    const parser = new Parser(tokens);
    return parser.parse(vars);
  } catch (err) {
    console.warn(`Kingdom Query: failed to evaluate expression "${expression}":`, err);
    return 0;
  }
}

/** Throws ExpressionError with a helpful message if the expression is invalid. Used by the builder to validate as the user types. */
export function assertValidExpression(expression: string, sampleVars: Record<string, number>): void {
  const tokens = tokenize(expression);
  new Parser(tokens).parse(sampleVars);
}
