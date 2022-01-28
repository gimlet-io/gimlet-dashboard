import React, { Component } from "react";
import HelmUI from "helm-react-ui";
import "./style.css";
import PopUpWindow from "./popUpWindow";
import ReactDiffViewer from "react-diff-viewer";

class ChartUI extends Component {
  constructor(props) {
    super(props);

    let reduxState = this.props.store.getState();
    this.state = {
      chartSchema: reduxState.chartSchema,
      chartUISchema: reduxState.chartUISchema,
      saveButtonTriggered: false,
      getEnvConfigFetched: false,
      isError: false,
      errorMessage: "",
      values: {},
      nonDefaultValues: {},
      defaultState: {},
    };

    this.props.store.subscribe(() => {
      let reduxState = this.props.store.getState();

      this.setState({ chartSchema: reduxState.chartSchema });
      this.setState({ chartUISchema: reduxState.chartUISchema });
    });

    this.setValues = this.setValues.bind(this);
  }

  componentDidMount() {
    const { owner, repo, env } = this.props.match.params;
    this.props.gimletClient.getEnvConfig(owner, repo, env)
      .then(envConfig => {
        if (Object.keys(envConfig).length !== 0) {
          this.setState({ values: envConfig.values });
          this.setState({ defaultState: Object.assign({}, envConfig.values) });
          this.setState({ nonDefaultValues: envConfig.values });
        }
      }, () => {/* Generic error handler deals with it */
      });
  }

  validationCallback(errors) {
    if (errors) {
      console.log(errors);
    }
  }

  setValues(values, nonDefaultValues) {
    this.setState({ values: values, nonDefaultValues: nonDefaultValues });
  }

  save() {
    console.log('Saving');
    this.setState({ saveButtonTriggered: true });
    const { owner, repo, env } = this.props.match.params;
    this.props.gimletClient.saveEnvConfig(owner, repo, env, this.state.nonDefaultValues)
      .then(data => {
        console.log('Saved');
        this.setState({ getEnvConfigFetched: true, defaultState: Object.assign({}, this.state.nonDefaultValues) });
      }, err => {
        this.setState({ getEnvConfigFetched: true, isError: true, errorMessage: err.statusText })
      });
    setTimeout(() => {
      this.setState({ saveButtonTriggered: false, getEnvConfigFetched: false, errorMessage: "", isError: false })
    }, 3000);
  }

  render() {
    const { owner, repo, env } = this.props.match.params;
    const repoName = `${owner}/${repo}`

    const nonDefaultValuesString = JSON.stringify(this.state.nonDefaultValues);
    const hasChange = nonDefaultValuesString !== '{ }' &&
      nonDefaultValuesString !== JSON.stringify(this.state.defaultState);

    if (!this.state.chartSchema) {
      return null;
    }

    if (!this.state.chartUISchema) {
      return null;
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900">{repoName}/envs/{env}
          <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer">
            <svg xmlns="http://www.w3.org/2000/svg"
              className="inline fill-current text-gray-500 hover:text-gray-700 ml-1" width="12" height="12"
              viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path
                d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
            </svg>
          </a>
        </h1>
        <button class="text-gray-500 hover:text-gray-700" onClick={() => window.location.href.indexOf(`${env}#`) > -1 ? this.props.history.go(-2) : this.props.history.go(-1)}>
          &laquo; back
        </button>
        <div className="fixed bottom-0 right-20">
          <span className="inline-flex rounded-md shadow-sm m-8 gap-x-3">
            <button
              type="button"
              disabled={!hasChange || this.state.saveButtonTriggered}
              className={(hasChange && !this.state.saveButtonTriggered ? `cursor-pointer bg-red-600 hover:bg-red-500 focus:border-red-700 focus:shadow-outline-indigo active:bg-red-700` : `bg-gray-600 cursor-default`) + ` inline-flex items-center px-6 py-3 border border-transparent text-base leading-6 font-medium rounded-md text-white focus:outline-none transition ease-in-out duration-150`}
              onClick={() => {
                this.setState({ values: Object.assign({}, this.state.defaultState) });
                this.setState({ nonDefaultValues: Object.assign({}, this.state.defaultState) });
              }}
            >
              Reset
            </button>
            <button
              type="button"
              disabled={!hasChange || this.state.saveButtonTriggered}
              className={(hasChange && !this.state.saveButtonTriggered ? 'bg-green-600 hover:bg-green-500 focus:outline-none focus:border-green-700 focus:shadow-outline-indigo active:bg-green-700' : `bg-gray-600 cursor-default`) + ` inline-flex items-center px-6 py-3 border border-transparent text-base leading-6 font-medium rounded-md text-white transition ease-in-out duration-150`}
              onClick={() => this.save()}
            >
              Save
            </button>
            {this.state.saveButtonTriggered && <PopUpWindow getEnvConfigFetched={this.state.getEnvConfigFetched} errorMessage={this.state.errorMessage} isError={this.state.isError} />}
          </span>
        </div>
        <div className="container mx-auto m-8">
          <HelmUI
            schema={this.state.chartSchema}
            config={this.state.chartUISchema}
            values={this.state.values}
            setValues={this.setValues}
            validate={true}
            validationCallback={this.validationCallback}
          />
           <ReactDiffViewer oldValue={JSON.stringify(this.state.defaultState)} newValue={JSON.stringify(this.state.nonDefaultValues)} splitView={true} />
        </div>
      </div>
    );
  }
}

export default ChartUI;
