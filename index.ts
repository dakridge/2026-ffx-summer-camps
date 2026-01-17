import index from "./index.html";

const campsData = await Bun.file("data/fcpa-camps.json").json();

Bun.serve({
  port: 3002,
  routes: {
    "/": index,
    "/api/camps": {
      GET: () => {
        return Response.json(campsData["2026 FCPA Camps"]);
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("Server running at http://localhost:3002");
