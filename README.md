**ARCHIVED**

**Merged into https://github.com/gimlet-io/gimlet**

**The docker image location is still ghcr.io/gimlet-io/gimlet-dashboard:latest**

**Look for future releases under https://github.com/gimlet-io/gimlet/releases tagged with dashboard-vx.y.z**

# Gimlet Dashboard

Gimlet Dashboard is where you can get a comprehensive overview quick.

- It displays realtime Kubernetes information about your deployments
- also realtime git information about your commits, branches and their build statuses
- You can also initiate releases and rollbacks, just like with Gimlet CLI

Gimlet Dash receives real-time Kubernetes information from the Gimlet Agent, talks to GimletD to take release actions, and talks to your application source code git repository to collect commit information.

## Running Gimlet Dashboard in Gitpod

### Gitpod variables

The .gitpod.yml file tries to automate the much of the environment configuration.

You have to set the following Gitpod variables for Gimlet Dashboard to start up:

- GITHUB_APP_ID
- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET
- GITHUB_INSTALLATION_ID
- GITHUB_ORG
- GITHUB_PRIVATE_KEY: use the `sed -z 's/\n/\\n/g' my_ssh_key | base64 -w 0` command to get the approproate format for storing the SSH key

Create a github application following the steps in https://gimlet.io/docs/install-the-gimlet-dash-ui/#integrate-it-with-github to fill the above variables.

### Starting up

- Start the `Gimlet Dashboard` launch configuration in VSCode debugger to start the API.
- Start the frontend server with `cd web; npm run start`

### Logging in

Visit the `gp url 9000` location on the `/auth` path and complete the Github OAuth flow.
When it is done it returns 404, but fear not, steal the `user_sess` cookie and add it under the `gp url 3000` website.

For the OAuth flow to succeed, update the Github Application's "Homepage URL" and "Callback URL" to `gp url 9000` and `gp url 9000` /auth respectively.

### Getting k8s data

Start the Gimlet Dashboard agent and configure it to send data to the Gimlet Dashboard instance running in Gitpod. Follow the https://gimlet.io/docs/installing-gimlet-agent/ guide
