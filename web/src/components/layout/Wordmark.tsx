import { Link } from "react-router-dom";

export function Wordmark() {
  return <span className="text-lg font-semibold text-ink">E-commerce</span>;
}

export function WordmarkLink() {
  return (
    <Link to="/" className="inline-flex items-center" aria-label="E-commerce home">
      <Wordmark />
    </Link>
  );
}
