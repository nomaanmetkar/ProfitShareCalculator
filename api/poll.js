const POLL_PATH = 'data/poll-results.json';
const DEFAULT_POLL = {
  poll_id: 'profit-share-2026',
  question: "What is your estimate of the company's profit share for this financial year?",
  options: {
    '13-15': 0,
    '16-18': 0,
    '19-20': 0,
    '21-22': 0
  },
  total_votes: 0,
  created_at: '2026-04-28T00:00:00.000Z',
  updated_at: '2026-04-28T00:00:00.000Z'
};

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.send(JSON.stringify(body));
}

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !repo) {
    return null;
  }

  return { token, repo, branch };
}

async function githubRequest(config, path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'User-Agent': 'profit-share-calculator',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status}: ${text}`);
  }

  return response;
}

async function loadPoll(config) {
  const response = await githubRequest(
    config,
    `/repos/${config.repo}/contents/${POLL_PATH}?ref=${encodeURIComponent(config.branch)}`
  );
  const payload = await response.json();
  const decoded = Buffer.from(payload.content, 'base64').toString('utf8');
  return {
    sha: payload.sha,
    poll: JSON.parse(decoded)
  };
}

async function savePoll(config, poll, sha) {
  const content = Buffer.from(JSON.stringify(poll, null, 2) + '\n', 'utf8').toString('base64');
  const response = await githubRequest(
    config,
    `/repos/${config.repo}/contents/${POLL_PATH}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update poll results for ${poll.poll_id}`,
        content,
        sha,
        branch: config.branch
      })
    }
  );

  return response.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const config = getConfig();
  if (!config) {
    return json(res, 500, {
      error: 'Missing GitHub configuration',
      required: ['GITHUB_TOKEN', 'GITHUB_REPO'],
      note: 'Set these as server environment variables before using poll persistence.'
    });
  }

  try {
    const { sha, poll } = await loadPoll(config);

    if (req.method === 'GET') {
      return json(res, 200, poll);
    }

    const option = req.body && req.body.option;
    if (!option || !Object.prototype.hasOwnProperty.call(poll.options, option)) {
      return json(res, 400, { error: 'Invalid poll option' });
    }

    const nextPoll = {
      ...poll,
      options: {
        ...poll.options,
        [option]: (poll.options[option] || 0) + 1
      },
      total_votes: (poll.total_votes || 0) + 1,
      updated_at: new Date().toISOString()
    };

    await savePoll(config, nextPoll, sha);
    return json(res, 200, nextPoll);
  } catch (error) {
    return json(res, 500, {
      error: 'Unable to access poll data',
      detail: error.message
    });
  }
};
