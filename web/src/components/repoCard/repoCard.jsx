import React from "react";

function RepoCard(props) {
  const {name, services} = props;

  const serviceWidgets = services.map(service => {
    let ingressWidgets = [];
    if (service.ingresses !== undefined) {
      ingressWidgets = service.ingresses.map(ingress => (
        <li>{ingress.url}
          <a href={ingress.url} target="_blank" rel="noopener noreferrer">
            <svg xmlns="http://www.w3.org/2000/svg"
                 className="inline fill-current text-gray-400 hover:text-teal-300 ml-1" width="12"
                 height="12" viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" fill="none"/>
              <path
                d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
          </a>
        </li>
      ))
    }

    return (
      <div>
        <p className="text-xs">{service.service.namespace}/{service.service.name}
          <span
            className="flex-shrink-0 inline-block px-2 py-0.5 mx-1 text-green-800 text-xs font-medium bg-green-100 rounded-full">
          {service.env}
        </span>
        </p>
        <ul className="text-xs pl-2">
          {ingressWidgets}
        </ul>
      </div>
    )
  })

  return (
    <div className="w-full flex items-center justify-between p-6 space-x-6">
      <div className="flex-1 truncate">
        <p className="text-sm font-bold">{name}</p>
        <div className="p-2 space-y-2">
          {serviceWidgets}
        </div>
      </div>
    </div>
  )
}

export default RepoCard;