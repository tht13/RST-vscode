from docutils import core
import sys
filepath = sys.argv[1]

page_string = open(filepath, 'r', encoding="utf-8-sig").read()

overrides = {'input_encoding': 'unicode',
            'doctitle_xform': True,
            'initial_header_level': 1,
            'halt_level': 5}
parts = core.publish_parts(
    source=page_string, source_path=filepath, writer_name='html', settings_overrides=overrides)

rtn = parts['html_body']
#remove bom
rtn = rtn.replace('\ufeff', '')

print(rtn)