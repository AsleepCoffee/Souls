import { Link } from "react-router-dom";
import "./Breadcrumb.css";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="breadcrumb__item">
          {item.to ? (
            <Link to={item.to} className="breadcrumb__link">
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumb__current" aria-current="page">
              {item.label}
            </span>
          )}
          {i < items.length - 1 && (
            <span className="breadcrumb__sep" aria-hidden="true">
              /
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
