export default function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        Product Detail
      </h1>
      <p className="text-[var(--text-secondary)]">Product ID: {params.id}</p>
      {/* ProductHero, SizeSelector, StorePicker, PayIn3Banner in Phase 5 */}
    </div>
  );
}
