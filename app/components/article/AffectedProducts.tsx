"use client";
import { ShieldAlert } from "lucide-react";
export function AffectedProducts({ affected, action }: { affected?: string; action?: string }) { if (!affected) return null; const products = affected.split(/[,;|]/).map((value) => value.trim()).filter(Boolean); return <div className="affected-products"><span>AFFECTED PRODUCTS</span><h3><ShieldAlert size={17} />Am I affected?</h3><p>Check whether you use any of these products or versions.</p><ul>{products.map((product) => <li key={product}>{product}</li>)}</ul>{action && <small>Recommended action: {action}</small>}</div> }
