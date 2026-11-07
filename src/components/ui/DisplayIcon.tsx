const paths: Record<string, string> = {
  checklist: "M9 4H5v16h14V4h-4M9 3h6v4H9zM8 12l2 2 4-4m-6 7h8",
  mouth: "M3 12c3-2 6-5 9-3 3-2 6 1 9 3-3 4-6 6-9 6s-6-2-9-6Zm0 0h18",
  listen: "M3 13v-2a9 9 0 0 1 18 0v2M3 13h4v6H5a2 2 0 0 1-2-2v-4Zm18 0h-4v6h2a2 2 0 0 0 2-2v-4Z",
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0zM5 11v1a7 7 0 0 0 14 0v-1m-7 8v3m-3 0h6",
  book: "M12 6C8 3 5 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-2-1-5-2-9 1Zm0 0v14",
  chat: "M21 11a8 8 0 0 1-8 8h-2l-5 3v-4a8 8 0 1 1 15-7ZM8 11h8m-8 3h5",
  award: "M8 14l-2 7 6-2 6 2-2-7M12 3a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z",
  letters: "m3 17 4-10 4 10m-6-3h4m5-7h3a2.5 2.5 0 0 1 0 5h-3m0 0h4a2.5 2.5 0 0 1 0 5h-4z",
  music: "M9 18V5l11-2v13M9 18a3 2 0 1 1-6 0 3 2 0 0 1 6 0Zm11-2a3 2 0 1 1-6 0 3 2 0 0 1 6 0Z",
  link: "m10 14 4-4m-6 1-3 3a4 4 0 0 0 6 6l3-3m-4-10 3-3a4 4 0 1 1 6 6l-3 3",
  edit: "m13 6 5 5M4 20l5-1L21 7l-5-5L4 14v6Z",
  end: "M20 5v14M4 12h12m-5-5 5 5-5 5",
  target: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  sprout: "M12 21v-9m0 2c-6 0-8-3-8-7 5 0 8 2 8 7Zm0-3c0-5 3-7 8-7 0 4-2 7-8 7Z",
  chart: "M4 3v17h17M8 16v-4m4 4V8m4 8V5m4 11v-6",
  user: "M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-8 16a8 6 0 0 1 16 0",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  check: "m5 12 4 4L19 6",
  folder: "M3 6h7l2 3h9v11H3z",
  shuffle: "M3 6h3c4 0 6 12 10 12h5m-4-4 4 4-4 4M3 18h3c1.5 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4",
};

export default function DisplayIcon({ name, className = "" }: { name?: string; className?: string }) {
  return (
    <svg aria-hidden="true" width="1em" height="1em" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      className={`inline-block align-middle shrink-0 ${className}`}>
      <path d={name ? paths[name] ?? paths.target : paths.target} />
    </svg>
  );
}
