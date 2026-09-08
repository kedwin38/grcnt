import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Green Color Networks",
    short_name: "Green Color",
    description:
      "Buy Safaricom data bundles, airtime, minutes and phones with secure M-Pesa payments.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfdf9",
    theme_color: "#3aa335",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
