; Adapted from alameya/zed-gherkin (MIT)
; Highlight the contents of a doc string with the language named by its media type, e.g.
;
;   When I inspect the payload
;     """xml
;     <user id="1"/>
;     """
((doc_string
  (media_type) @language
  (doc_string_content) @content))
