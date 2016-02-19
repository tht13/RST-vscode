import sys
from docutils import core
filepath = sys.argv[1]

page_string = open(filepath, 'r').read()

overrides = {'input_encoding': 'unicode',
             'doctitle_xform': True,
             'initial_header_level': 1,
             'halt_level': 5}
parts = core.publish_parts(
    source=page_string, source_path=filepath, writer_name='html', settings_overrides=overrides)

html_document = parts['html_body']
#remove bom
html_document = html_document.replace('\ufeff', '')

print(html_document)
