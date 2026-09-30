import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { cardClass, sectionTitleClass } from "@/components/ui";
import { getCategories } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { deleteCard, deleteRule } from "./actions";
import { RuleForm } from "./rule-form";

type Rule = { id: string; pattern: string; category: { name: string; icon: string | null } | null };
type Card = { id: string; card_key: string; account: { name: string } };

export default async function ReglasPage() {
  const supabase = await createClient();
  const [rules, cards, categories] = await Promise.all([
    supabase
      .from("merchant_rules")
      .select("id, pattern, category:categories(name, icon)")
      .order("pattern")
      .returns<Rule[]>(),
    supabase
      .from("payment_cards")
      .select("id, card_key, account:accounts!payment_cards_account_id_user_id_fkey(name)")
      .order("card_key")
      .returns<Card[]>(),
    getCategories(),
  ]);
  if (rules.error) throw new Error(rules.error.message);
  if (cards.error) throw new Error(cards.error.message);

  return (
    <>
      <PageHeader title="Reglas" backHref="/mas" />
      <p className="px-1 text-sm text-muted">
        Así se clasifican los pagos que llegan de Apple Pay. Se aprenden solas cuando revisas un pago, y
        puedes agregar las tuyas. Una regla corta (&quot;uber&quot;) cubre todas las variantes del comercio.
      </p>

      <h2 className={sectionTitleClass}>Comercio → categoría</h2>
      <ul className={`${cardClass} divide-y divide-border`}>
        {rules.data.map((r) => (
          <li key={r.id} className="flex items-center gap-3 p-4">
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{r.pattern}</span>
            <span className="truncate text-sm text-muted">
              {r.category ? `${r.category.icon ?? ""} ${r.category.name}` : "—"}
            </span>
            <DeleteButton
              compact
              action={deleteRule.bind(null, r.id)}
              confirmMessage={`¿Eliminar la regla "${r.pattern}"?`}
              label="Eliminar regla"
            />
          </li>
        ))}
        {rules.data.length === 0 && (
          <li className="p-6 text-center text-sm text-muted">Aún no hay reglas.</li>
        )}
      </ul>

      <div className={`${cardClass} mt-3 p-4`}>
        <RuleForm categories={categories} />
      </div>

      <h2 className={sectionTitleClass}>Tarjeta → cuenta</h2>
      <ul className={`${cardClass} divide-y divide-border`}>
        {cards.data.map((c) => (
          <li key={c.id} className="flex items-center gap-3 p-4">
            <span className="min-w-0 flex-1 truncate">💳 {c.card_key}</span>
            <span className="text-sm text-muted">{c.account.name}</span>
            <DeleteButton
              compact
              action={deleteCard.bind(null, c.id)}
              confirmMessage={`¿Olvidar la tarjeta "${c.card_key}"?`}
              label="Olvidar tarjeta"
            />
          </li>
        ))}
        {cards.data.length === 0 && (
          <li className="p-6 text-center text-sm text-muted">
            Se agregan solas al revisar el primer pago de cada tarjeta.
          </li>
        )}
      </ul>
    </>
  );
}
