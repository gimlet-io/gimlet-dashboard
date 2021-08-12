export default class GimletClient {
  constructor(onError) {
    if (typeof window !== 'undefined') {
      let port = window.location.port;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        port = 9000;
      }
      this.url = window.location.protocol + '//' + window.location.hostname;
      if (port && port !== '') {
        this.url = this.url + ':' + port;
      }
    }

    this.onError = onError
  }

  URL = () => this.url;

  getUser = () => this.get('/api/user');

  getEnvs = () => this.get('/api/envs');

  getGimletD = () => this.get('/api/gimletd');

  getRolloutHistory = (owner, name) => this.get(`/api/repo/${owner}/${name}/rolloutHistory`);

  getCommits = (owner, name, branch) => this.get(`/api/repo/${owner}/${name}/commits?branch=${branch}`);

  getBranches = (owner, name) => this.get(`/api/repo/${owner}/${name}/branches`);

  deploy = (artifactId, env, app) => this.post('/api/deploy', JSON.stringify({ env, app, artifactId }));

  get = (path) => fetch(this.url + path, {
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

  post = (path, body) => fetch(this.url + path, {
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

  postWithoutCreds = (path, body) => fetch(this.url + path, {
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
