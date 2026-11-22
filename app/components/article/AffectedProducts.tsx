"use client";
import { ShieldAlert } from "lucide-react";
import type { CyberMetadata } from "../../../lib/models";

export function AffectedProducts({ metadata }: { metadata: CyberMetadata }) {
  const listed = metadata.affected && !/^(?:check the linked source|specified in the official)/i.test(metadata.affected)
    ? metadata.affected.split(" | ") : [];
  const products = [...new Set([...listed, ...(metadata.vulnerabilities ?? []).flatMap(({ affected }) => affected ?? [])])];
  return <section className="article-block affected-products">
    <h2><ShieldAlert size={17} aria-hidden="true" /> Am I affected?</h2>
    {products.length ? <><p>Compare your product and version with the linked advisory.</p><ul>{products.map((product) => <li key={product}>{product}</li>)}</ul></>
      : <p>The available evidence does not identify affected products or versions.</p>}
  </section>;
}
