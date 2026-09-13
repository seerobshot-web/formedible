"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { newId } from "@/lib/kingdom-query/id";
import type {
  PaymentEmbed,
  PaymentEmbedProvider,
  PaymentEmbedType,
  Survey,
} from "@/lib/kingdom-query/types";

interface Props {
  survey: Survey;
  paymentEmbeds: PaymentEmbed[];
  onPaymentEmbedsChange: (embeds: PaymentEmbed[]) => void;
  onDeletePaymentEmbed: (id: string) => void;
}

const PROVIDERS: PaymentEmbedProvider[] = ["stripe", "paypal", "custom"];
const EMBED_TYPES: PaymentEmbedType[] = ["checkout_link", "payment_element", "custom_html"];

export function GrowthEditor({
  survey,
  paymentEmbeds,
  onPaymentEmbedsChange,
  onDeletePaymentEmbed,
}: Props) {
  function addEmbed() {
    const embed: PaymentEmbed = {
      id: newId(),
      survey_id: survey.id,
      question_id: null,
      provider: "stripe",
      embed_type: "checkout_link",
      label: "Upgrade",
      config: {},
      position: paymentEmbeds.length,
    };
    onPaymentEmbedsChange([...paymentEmbeds, embed]);
  }

  function update(id: string, fields: Partial<PaymentEmbed>) {
    onPaymentEmbedsChange(paymentEmbeds.map((e) => (e.id === id ? { ...e, ...fields } : e)));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lead capture &amp; newsletter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Every completed response with an answered email question is automatically recorded as
            a lead. When &quot;Ask respondents to opt in&quot; is enabled (Distribute tab) and they
            check it, their email is also added to your newsletter list.
          </p>
          <p>View captured leads and newsletter sign-ups on the Results page.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Payment embeds</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Configure a checkout link, embedded payment element, or custom HTML snippet to show on
            the thank-you screen (e.g. an upsell right after someone gets their result). This
            stores the configuration only — wiring it up to a live Stripe/PayPal account is a
            follow-up integration step.
          </p>
          {paymentEmbeds.map((embed) => (
            <PaymentEmbedRow key={embed.id} embed={embed} onUpdate={update} onDelete={onDeletePaymentEmbed} />
          ))}
          <Button variant="outline" size="sm" onClick={addEmbed} className="self-start">
            <Plus className="size-3.5" /> Add payment embed
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentEmbedRow({
  embed,
  onUpdate,
  onDelete,
}: {
  embed: PaymentEmbed;
  onUpdate: (id: string, fields: Partial<PaymentEmbed>) => void;
  onDelete: (id: string) => void;
}) {
  function updateConfig(fields: Record<string, string>) {
    onUpdate(embed.id, { config: { ...embed.config, ...fields } });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <Input
          className="flex-1"
          placeholder="Label"
          value={embed.label}
          onChange={(e) => onUpdate(embed.id, { label: e.target.value })}
        />
        <Select
          value={embed.provider}
          onValueChange={(provider) => onUpdate(embed.id, { provider: provider as PaymentEmbedProvider })}
        >
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={embed.embed_type}
          onValueChange={(embed_type) => onUpdate(embed.id, { embed_type: embed_type as PaymentEmbedType })}
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMBED_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={() => onDelete(embed.id)}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>

      {embed.embed_type === "checkout_link" && (
        <Input
          placeholder="Checkout URL"
          value={embed.config.url ?? ""}
          onChange={(e) => updateConfig({ url: e.target.value })}
        />
      )}
      {embed.embed_type === "payment_element" && (
        <div className="flex gap-2">
          <Input
            placeholder="Publishable key"
            value={embed.config.publishableKey ?? ""}
            onChange={(e) => updateConfig({ publishableKey: e.target.value })}
          />
          <Input
            placeholder="Price ID"
            value={embed.config.priceId ?? ""}
            onChange={(e) => updateConfig({ priceId: e.target.value })}
          />
        </div>
      )}
      {embed.embed_type === "custom_html" && (
        <Textarea
          placeholder="<div>...</div>"
          rows={3}
          className="font-mono text-xs"
          value={embed.config.html ?? ""}
          onChange={(e) => updateConfig({ html: e.target.value })}
        />
      )}
    </div>
  );
}
