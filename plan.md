authors.md
  - list of users, pipe separated.
  - no logic at all, username and id. Id is a simple incremental number.
  - example: user_1 | jay, user_2 | sharan, user_3 | user_3 etc.

<user_1.md>
  - for each user, create a markdown file.
  - content will be a simple text file with their details. A list of thoughts id and date, and their name at the top.
  - example: 
    - name: jay
    - thoughts:
    - t1 | 2026-02-22
    - t2 | 2026-02-23
    - t3 | 2026-02-24

<thoughts_<date>.md>
  - for each date, create a markdown file.
  - content will be a simple text with the following meta data
    - thought
    - thought_id <incremental string>
    - author_id <user_id | username>
    - stars <number>