export const PROJECT = {
  name: "Cyber Chronicle",
  creator: {
    name: "Nikhilesh",
    role: "Founder & Developer",
    links: {
      linkedin: "https://www.linkedin.com/in/nikhilesh-shingade-a42348383/",
      github: "https://github.com/Nikhilesh-CS",
      instagram: "https://www.instagram.com/nikhilesh._.18/",
    },
  },
} as const;

export const CREATOR_LINKS = [
  { key: "linkedin", label: "LinkedIn", description: "Professional profile", href: PROJECT.creator.links.linkedin, emphasis: "primary" },
  { key: "github", label: "GitHub", description: "Projects & development", href: PROJECT.creator.links.github, emphasis: "primary" },
  { key: "instagram", label: "Instagram", description: "Social profile", href: PROJECT.creator.links.instagram, emphasis: "secondary" },
] as const;
