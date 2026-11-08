// Optional DNS_SERVERS (comma-separated, e.g. "8.8.8.8,1.1.1.1"). On some
// Windows machines Node's own DNS resolver falls back to 127.0.0.1, so the
// mongodb+srv:// lookup fails with "querySrv ECONNREFUSED" even though the
// browser and nslookup work. Setting this makes Node ask those servers instead.
// Leave it unset where DNS already works (Railway doesn't set it).
const dns = require('dns');

function useDnsServers() {
  const servers = process.env.DNS_SERVERS;
  if (!servers) return;
  dns.setServers(servers.split(',').map((server) => server.trim()));
}

module.exports = useDnsServers;
