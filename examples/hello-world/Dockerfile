# Copyright (c) Guenter Sandner. Licensed under the MIT License.

#--------------------------------------------------
FROM    ubuntu

#--------------------------------------------------
#  install and configure PostgreSQL:

ENV     DEBIAN_FRONTEND=noninteractive

RUN     apt-get update \
    &&  apt-get install -y \
            locales \
            nodejs \
            npm \
            postgresql \
            postgresql-client \
            postgresql-contrib \
            sudo \
    &&  rm -rf /var/lib/apt/lists/* \
    &&  localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8

ENV     LANG en_US.utf8

RUN     service postgresql start \
    &&  su -l postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\""

#--------------------------------------------------
#  create user 'coaty'

RUN     groupadd -g 1000 coaty \
    &&  useradd -ms /bin/bash -u 1000 -g 1000 -G postgres,sudo coaty \
    &&  echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

#--------------------------------------------------
#  create installation directory

WORKDIR /opt/coaty-hello-world

COPY    . .

RUN     chown -R coaty:coaty /opt/coaty-hello-world

#--------------------------------------------------
#  install coaty and build the sample

USER    coaty

RUN     npm install \
    &&  npm run build

#--------------------------------------------------
#  start postgresql and the broker

CMD     sudo service postgresql start \
    &&  npm run broker

