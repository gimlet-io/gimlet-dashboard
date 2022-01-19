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

    return (
      <div>
        <div className="fixed bottom-0 right-0">
          <span className="inline-flex rounded-md shadow-sm m-8">
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
