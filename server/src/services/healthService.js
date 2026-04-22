function getHealthStatus() {
  return {
    ok: true,
    time: new Date().toISOString(),
    uptime: process.uptime(),
  };
}

module.exports = {
  getHealthStatus,
};
