FROM alpine:3.13

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

ENV DATABASE_DRIVER=sqlite3
ENV DATABASE_CONFIG=/var/lib/gimlet-dashboard/gimletd.sqlite
ENV XDG_CACHE_HOME /var/lib/gimlet-dashboard

ADD bin/gimlet-dashboard-linux-x86_64 /bin/gimlet-dashboard

RUN addgroup -S gimlet-dashboard && adduser -S gimlet-dashboard -G gimlet-dashboard

ADD docker/known_hosts /etc/ssh/ssh_known_hosts

RUN mkdir /var/lib/gimlet-dashboard
RUN chown gimlet-dashboard:gimlet-dashboard /var/lib/gimlet-dashboard

USER gimlet-dashboard
WORKDIR /var/lib/gimlet-dashboard

RUN git config --global user.name "Gimlet Dashboard"
RUN git config --global user.email "gimlet-dashboard@gimlet.io"

EXPOSE 9000
CMD ["/bin/gimlet-dashboard"]
