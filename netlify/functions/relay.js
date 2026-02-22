exports.handler = async (event) => {
  // Handle CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    const { path, content, message, sha, owner, repo } = JSON.parse(event.body);
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return { statusCode: 500, headers, body: "Server Error: GITHUB_TOKEN not configured." };
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "Netlify-Relay",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, content, sha }),
    });

    const data = await response.json();
    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: err.message };
  }
};
