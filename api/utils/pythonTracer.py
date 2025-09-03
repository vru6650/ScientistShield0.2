import sys
import json
import io
import runpy

traces = []

def tracefunc(frame, event, arg):
    if event in ('call', 'line', 'return'):
        traces.append({
            'event': event,
            'line': frame.f_lineno,
            'locals': {k: repr(v) for k, v in frame.f_locals.items()}
        })
    return tracefunc

def main(script_path):
    with open(script_path, 'r') as f:
        code = f.read()
    stdout_buffer = io.StringIO()
    sys.stdout = stdout_buffer
    sys.settrace(tracefunc)
    status = 'ok'
    error = ''
    try:
        exec(compile(code, script_path, 'exec'), {})
    except Exception as e:
        status = 'error'
        error = str(e)
    finally:
        sys.settrace(None)
        sys.stdout = sys.__stdout__
    result = {
        'status': status,
        'stdout': stdout_buffer.getvalue(),
        'traces': traces
    }
    if status == 'error':
        result['error'] = error
    print(json.dumps(result))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'status': 'error', 'error': 'No script path provided', 'traces': [], 'stdout': ''}))
    else:
        main(sys.argv[1])
