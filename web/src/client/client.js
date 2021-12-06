export default class GimletClient {
  constructor(onError) {
    this.onError = onError
  }

  URL = () => this.url;

  getUser = () => this.get('/api/user');

  getGitopsRepo = () => this.get('/api/gitopsRepo');

  getAgents = () => this.get('/api/agents');

  getEnvs = () => this.get('/api/envs');

  getGitRepos = () => this.get('/api/gitRepos');

  getGimletD = () => this.get('/api/gimletd');

  getRolloutHistory = (owner, name) => this.get(`/api/repo/${owner}/${name}/rolloutHistory`);

  getCommits = (owner, name, branch) => this.get(`/api/repo/${owner}/${name}/commits?branch=${branch}`);

  getBranches = (owner, name) => this.get(`/api/repo/${owner}/${name}/branches`);

  deploy = (artifactId, env, app) => this.post('/api/deploy', JSON.stringify({ env, app, artifactId }));

  rollback = (env, app, rollbackTo) => this.post('/api/rollback', JSON.stringify({ env, app, targetSHA: rollbackTo }));

  getDeployStatus = (trackingId) => this.get(`/api/deployStatus?trackingId=${trackingId}`);

  saveFavoriteRepos = (favoriteRepos) => this.post('/api/saveFavoriteRepos', JSON.stringify({ favoriteRepos }));

  saveFavoriteServices = (favoriteServices) => this.post('/api/saveFavoriteServices', JSON.stringify({ favoriteServices }));

  get = (path) => fetch(path, {
    credentials: 'include'
  })
    .then(response => {
      if (!response.ok  && window !== undefined) {
        return Promise.reject({ status: response.status, statusText: response.statusText, path });
      }
      return response.json();
    })
    .catch((error) => {
      this.onError(error);
      throw error;
    });

  post = (path, body) => fetch(path, {
    method: 'post',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body
  })
    .then(response => {
      if (!response.ok  && window !== undefined) {
        return Promise.reject({ status: response.status, statusText: response.statusText, path });
      }
      return response.json();
    })
    .catch((error) => {
      this.onError(error);
      throw error;
    });

  postWithoutCreds = (path, body) => fetch(path, {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body
  })
    .then(response => {
      if (!response.ok  && window !== undefined) {
        return Promise.reject({ status: response.status, statusText: response.statusText, path });
      }
      return response.json();
    })
    .catch((error) => {
      this.onError(error);
      throw error;
    })
}
