import {format, formatDistance} from "date-fns";
import React from "react";

export function RolloutHistory(props) {
  let {rolloutHistory} = props;

  console.log(rolloutHistory)

  if (!rolloutHistory) {
    return null;
  }

  rolloutHistory.sort((first, second) => {
    return first.created > second.created
  });

  let previousDateLabel = ''
  const markers = rolloutHistory.map((rollout) => {

    const exactDate = format(rollout.created * 1000, 'h:mm:ss a, MMMM do yyyy')
    const dateLabel = formatDistance(rollout.created * 1000, new Date());

    const showDate = previousDateLabel !== dateLabel
    previousDateLabel = dateLabel;

    let color = rollout.rolledBack ? 'bg-red-100' : 'bg-green-100';
    let border = showDate ? 'border-l' : '';

    let title = `[${rollout.version.sha.slice(0, 6)}] ${truncate(rollout.version.message)}

Deployed by ${rollout.triggeredBy}

at ${exactDate}`;

    return (
      <div class={`h-8 ${border} cursor-pointer`} title={title}>
        <div className={`h-1 sm:h-2 mx-2 ${color} rounded`}></div>
        {showDate &&
        <div class="mx-2 mt-2 text-xs text-gray-400">
          <span title={exactDate}>{dateLabel} ago</span>
        </div>
        }
      </div>
    )
  })

  return (
    <div class="grid grid-cols-10">
      {markers}
    </div>
  )
}

function truncate(input) {
  if (input.length > 30) {
    return input.substring(0, 30) + '...';
  }
  return input;
};
