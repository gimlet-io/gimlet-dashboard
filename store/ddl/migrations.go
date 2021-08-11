// Copyright 2019 Laszlo Fogas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package ddl

const createTableUsers = "create-table-users"
const addNameColumnToUsersTable = "add-name-column-to-users-table"
const createTableCommits = "create-table-commits"
const addMessageColumnToCommitsTable = "add-message-column-to-commits-table"
const addCreatedColumnToCommitsTable = "add-created-column-to-commits-table"
const defaultValueForMessage = "default-value-for-message"
const defaultValueForCreated = "default-value-for-created"

type migration struct {
	name string
	stmt string
}

var migrations = map[string][]migration{
	"sqlite3": {
		{
			name: createTableUsers,
			stmt: `
CREATE TABLE IF NOT EXISTS users (
id           INTEGER PRIMARY KEY AUTOINCREMENT,
login         TEXT,
email         TEXT,
access_token  TEXT,
refresh_token TEXT,
expires       INT,
secret        TEXT,
UNIQUE(login)
);
`,
		},
		{
			name: addNameColumnToUsersTable,
			stmt: `ALTER TABLE users ADD COLUMN name TEXT default '';`,
		},
		{
			name: createTableCommits,
			stmt: `
CREATE TABLE IF NOT EXISTS commits (
id         INTEGER PRIMARY KEY AUTOINCREMENT,
sha        TEXT,
url        TEXT,
author     TEXT,
author_pic TEXT,
tags       TEXT,
repo       TEXT,
status 	   TEXT,
UNIQUE(sha,repo)
);
`,
		},
		{
			name: addMessageColumnToCommitsTable,
			stmt: `ALTER TABLE commits ADD COLUMN message TEXT;`,
		},
		{
			name: addCreatedColumnToCommitsTable,
			stmt: `ALTER TABLE commits ADD COLUMN created INTEGER;`,
		},
		{
			name: defaultValueForMessage,
			stmt: `update commits set message='' where message is null;`,
		},
		{
			name: defaultValueForMessage,
			stmt: `update commits set created=0 where created is null;`,
		},
	},
	"postgres": {},
}
