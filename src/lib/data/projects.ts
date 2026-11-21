export type Project = {
  id: string;
  name: string;
  cueCount: number;
};

export const projects: Project[] = [
  { id: "autumn-light", name: "Autumn Light", cueCount: 214 },
  { id: "salt-and-stone", name: "Salt & Stone", cueCount: 89 },
  { id: "nightfall", name: "Nightfall", cueCount: 342 },
  { id: "paper-planes", name: "Paper Planes", cueCount: 156 },
  { id: "the-long-road", name: "The Long Road", cueCount: 78 },
  { id: "static", name: "Static", cueCount: 401 },
];
