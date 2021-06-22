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

  getEnvs = () => this.get('/api/envs');

  get = (path) => fetch(this.url + path, {
    credentials: 'include'
  })
    .then(response => {
      if (!response.ok  && window !== undefined) {
        console.log('rejecting')
        return Promise.reject({ status: response.status, statusText: response.statusText, path });
      }
      return response.json();
    })
    .catch((error) => {
      console.log('catching')
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
