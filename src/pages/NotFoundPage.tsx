import { Link } from "react-router-dom";
import "./NotFoundPage.css";

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <h2>Page not found</h2>
      <p>There's nothing at this URL.</p>
      <Link to="/">← Back to Home</Link>
    </div>
  );
}
