; Adapted from alameya/zed-gherkin (MIT)
; Comments
(comment) @comment

; Language directive: `# language: ru`
(language) @keyword.directive
(language_name) @constant
(invalid_language_name) @error

; Section keywords
[
  (feature_kw)
  (rule_kw)
  (background_kw)
  (scenario_kw)
  (scenario_outline_kw)
  (examples_kw)
] @keyword

; Colons after section keywords
(feature_line ":" @punctuation.delimiter)
(rule_line ":" @punctuation.delimiter)
(background_line ":" @punctuation.delimiter)
(scenario_line ":" @punctuation.delimiter)
(scenario_outline_line ":" @punctuation.delimiter)
(examples_line ":" @punctuation.delimiter)

; Step keywords (including the `*` shorthand)
[
  (given_kw)
  (when_kw)
  (then_kw)
  (and_kw)
  (but_kw)
] @keyword.function
(asterisk_line "* " @keyword.function)

; Titles of features, rules, scenarios and example blocks
(feature_line (context) @type)
(rule_line (context) @type)
(scenario_line (context) @type)
(scenario_outline_line (context) @type)
(background_line (context) @type)
(examples_line (context) @type)

; Prose descriptions of features/rules/scenarios/examples
(description) @comment.doc

; Tags: @wip
(tag) @tag

; Step parameters: <placeholder>
(step_param) @variable.parameter

; Doc strings (""" ... """ / ``` ... ```)
(doc_string ["\"\"\"" "```"] @string.special)
(doc_string (media_type) @label)
(doc_string_content) @string

; Data tables
(table_head_row (table_col (table_cell) @variable.parameter))
(table_row (table_col (table_cell) @string.special))

; Table delimiters
["|"] @punctuation.delimiter
