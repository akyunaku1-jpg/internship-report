let appPromise;

function getApp() {
  if (!appPromise) {
    appPromise = import("../server/app.js").then((mod) => mod.default);
  }
  return appPromise;
}

module.exports = async (req, res) => {
  const app = await getApp();
  return app(req, res);
};
