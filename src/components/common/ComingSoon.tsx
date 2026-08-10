import "./ComingSoon.css";

export function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <div className="coming-soon">
      <h2>{title}</h2>
      <p>This section is under construction.</p>
      {note && <p className="coming-soon__note">{note}</p>}
    </div>
  );
}
