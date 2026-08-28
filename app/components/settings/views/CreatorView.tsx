import React from "react";
import { ExternalLink } from "lucide-react";
import { CREATOR_LINKS, PROJECT } from "../../../../lib/project";
import { SettingsHeader } from "../SettingsHeader";
import { InfoBlock } from "../InfoBlock";

export function CreatorView({ onBack }: { onBack: () => void }) {
  return (
    <div className="settings-page">
      <SettingsHeader title="Creator" onBack={onBack} />
      <div className="settings-page-content">
        <InfoBlock>
          <p><strong>{PROJECT.creator.name}</strong></p>
          <p>{PROJECT.creator.role}<br/>{PROJECT.name}</p>
        </InfoBlock>

        <InfoBlock>
          <p><strong>FOCUS</strong></p>
          <ul style={{ paddingLeft: "20px", marginTop: "8px", fontSize: "13px", color: "var(--ink-soft)" }}>
            <li>Cybersecurity</li>
            <li>Artificial Intelligence</li>
            <li>Threat Intelligence</li>
            <li>Software Development</li>
          </ul>
        </InfoBlock>

        <InfoBlock>
          <p>
            {PROJECT.name} was designed and developed by {PROJECT.creator.name} as an independent technology project focused on making cybersecurity intelligence easier to access and understand.
          </p>
        </InfoBlock>

        <section className="creator-connect" aria-labelledby="creator-connect-heading">
          <strong id="creator-connect-heading">CONNECT</strong>
          <div>
            {CREATOR_LINKS.map((link) => (
              <a key={link.key} className={`creator-connect-link ${link.emphasis}`} href={link.href} target="_blank" rel="noopener noreferrer">
                <span><b>{link.label}</b><small>{link.description}</small></span>
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
