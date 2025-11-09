const { execSync } = require('child_process');

async function addDNS() {
  try {
    // Get zone ID for combinedmemory.com using curl
    const accountId = '4b339d9b82347caea48bbe42d4896bbd';
    
    // Read API token from wrangler config
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    
    const configPath = path.join(os.homedir(), '.wrangler/config/default.toml');
    
    if (!fs.existsSync(configPath)) {
      console.log('No wrangler config found. Please run: npx wrangler login');
      process.exit(1);
    }
    
    const config = fs.readFileSync(configPath, 'utf8');
    const tokenMatch = config.match(/api_token\s*=\s*"([^"]+)"/);
    
    if (!tokenMatch) {
      console.log('No API token in config. Trying OAuth...');
      
      // Try OAuth token
      const oauthMatch = config.match(/oauth_token\s*=\s*"([^"]+)"/);
      if (oauthMatch) {
        console.log('Found OAuth token');
        const token = oauthMatch[1];
        
        // Get zone ID
        const zonesCmd = `curl -s -H "Authorization: Bearer ${token}" "https://api.cloudflare.com/client/v4/zones?name=combinedmemory.com"`;
        const zonesResp = execSync(zonesCmd).toString();
        const zones = JSON.parse(zonesResp);
        
        if (!zones.success || !zones.result || zones.result.length === 0) {
          console.log('Could not find zone for combinedmemory.com');
          console.log(zonesResp);
          process.exit(1);
        }
        
        const zoneId = zones.result[0].id;
        console.log(`Zone ID: ${zoneId}`);
        
        // Add CNAME record
        const dnsData = JSON.stringify({
          type: 'CNAME',
          name: 'zen',
          content: 'zen-mode-mcp.quinn-4b3.workers.dev',
          ttl: 1,
          proxied: true
        });
        
        const addCmd = `curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" --data '${dnsData}'`;
        const addResp = execSync(addCmd).toString();
        const addResult = JSON.parse(addResp);
        
        if (addResult.success) {
          console.log('✅ DNS record added successfully!');
          console.log('zen.combinedmemory.com -> zen-mode-mcp.quinn-4b3.workers.dev');
        } else {
          console.log('❌ Failed to add DNS record:');
          console.log(JSON.stringify(addResult.errors, null, 2));
        }
      } else {
        console.log('No auth token found. Please run: npx wrangler login');
        process.exit(1);
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

addDNS();
