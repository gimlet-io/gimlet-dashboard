import React, { Component } from "react";
import * as schema from "./redux/values.schema.json";
import * as helmUIConfig from "./redux/helm-ui.json";
import HelmUI from "helm-react-ui";
import "./style.css";

class ChartUI extends Component {
  constructor(props) {
    super(props);

    const { owner, repo } = this.props.match.params;

    let reduxState = this.props.store.getState();
    this.state = {
      envs: reduxState.envs,
      chartSchema: reduxState.chartSchema,
      chartUISchema: reduxState.chartUISchema,
      envConfig: reduxState.envConfigs[`${owner}/${repo}`],
      values: {
        vars: {
          myvar: "myvalue",
          myvar2: "myvalue2",
        },
      },
      nonDefaultValues: {},
    };

    this.props.store.subscribe(() => {
      let reduxState = this.props.store.getState();

      this.setState({ envs: reduxState.envs });
      this.setState({ chartSchema: reduxState.chartSchema });
      this.setState({ chartUISchema: reduxState.chartUISchema });
      this.setState({ envConfig: reduxState.envConfigs[`${owner}/${repo}`] });
    });

    this.setValues = this.setValues.bind(this);
  }

  validationCallback(errors) {
    if (errors) {
      console.log(errors);
    }
  }

  setValues(values, nonDefaultValues) {
    this.setState({ values: values, nonDefaultValues: nonDefaultValues });
  }

  render() {
    const { owner, repo, env } = this.props.match.params;
    const repoName = `${owner}/${repo}`
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
        <button class="text-gray-500 hover:text-gray-700" onClick={() => this.props.history.goBack()}>
          &laquo; back
        </button>
        <div className="fixed bottom-0 right-20">
          <span className="inline-flex rounded-md shadow-sm m-8 gap-x-3">
            <button
              type="button"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base leading-6 font-medium rounded-md text-white bg-gray-600 hover:bg-gray-500 focus:outline-none focus:border-gray-700 focus:shadow-outline-indigo active:bg-gray-700 transition ease-in-out duration-150 opacity-50 cursor-not-allowed"
            >
              Reset
            </button>
            <button
              type="button"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base leading-6 font-medium rounded-md text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:border-red-700 focus:shadow-outline-indigo active:bg-red-700 transition ease-in-out duration-150"
              onClick={() => {
                console.log(this.state.values);
                console.log(this.state.nonDefaultValues);
              }}
            >
              Save
            </button>
          </span>
        </div>
        <div className="container mx-auto m-8">
          <HelmUI
            schema={this.state.chartSchema}
            config={this.state.chartUISchema}
            values={this.state.envConfig}
            setValues={this.setValues}
            validate={true}
            validationCallback={this.validationCallback}
          />
        </div>
      </div>
    );
  }
}

export default ChartUI;
