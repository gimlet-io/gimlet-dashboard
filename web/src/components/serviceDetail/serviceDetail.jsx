import React from 'react';
import {Deployment} from '../serviceCard/serviceCard'

function ServiceDetail(props) {
  const {service} = props;

  return (
    <div className="w-full flex items-center justify-between p-6 space-x-6 cursor-pointer">
      <div className="flex-1 truncate">
        <p className="text-sm font-bold">{service.service.namespace}/{service.service.name}
          <span
            className="flex-shrink-0 inline-block px-2 py-0.5 mx-1 text-green-800 text-xs font-medium bg-green-100 rounded-full">
            {service.env}
          </span>
        </p>
        <Deployment
          envName={service.env}
          deployment={service.deployment}
        />
      </div>
    </div>
  )
}

export default ServiceDetail;
