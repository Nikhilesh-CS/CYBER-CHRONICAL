import type { Metadata } from "next";
import { currentEdition } from "../../lib/edition";
import { formatDate, plainTitle } from "../../lib/editorial";
import { isCyberStory } from "../../lib/reader";
import { SITE_BASE_PATH, storyPath } from "../../lib/story-links";

export const metadata: Metadata = { title: "Cyber Digest | Cyber Chronicle" };

export default function DigestPage() {
  const generatedAt = Date.parse(currentEdition.generatedAt);
  const cyber = currentEdition.items.filter(isCyberStory);
  return <main className="standalone-page">
    <a href={`${SITE_BASE_PATH}/`}>Cyber Chronicle home</a>
    <h1>Cybersecurity digest</h1>
    <p>Edition built <time dateTime={currentEdition.generatedAt}>{formatDate(currentEdition.generatedAt, true)} IST</time> · <a href={`${SITE_BASE_PATH}/feeds/digest.xml`}>Subscribe via RSS</a></p>
    {[{ days: 1, label: "Past 24 hours", limit: 6 }, { days: 7, label: "Past week", limit: 15 }].map(({ days, label, limit }) => {
      const stories = cyber.filter((item) => {
        const published = Date.parse(item.publishedAt);
        return published <= generatedAt && published > generatedAt - days * 86_400_000;
      }).slice(0, limit);
      return <section key={days}><h2>{label}</h2>{stories.length ? <ol>{stories.map((item) => <li key={item.id}><a href={storyPath(item)}>{plainTitle(item)}</a> · {item.primaryPublisher}</li>)}</ol> : <p>No stories in this window.</p>}</section>;
    })}
  </main>;
}
