import sys
import json
import io
import ast

traces = []


def tracefunc(frame, event, arg):
    if event == 'line':
        traces.append({
            'event': 'step',
            'line': frame.f_lineno,
            'locals': {k: repr(v) for k, v in frame.f_locals.items()},
        })
    return tracefunc


def trace_expr(value, line, expr_source):
    traces.append({
        'event': 'expr',
        'line': line,
        'expr': expr_source,
        'value': repr(value),
    })
    return value


class ExprTracer(ast.NodeTransformer):
    def __init__(self, source):
        self.source = source

    def visit(self, node):
        node = super().visit(node)
        if isinstance(node, ast.expr) and not isinstance(node, (ast.Constant, ast.Name)):
            expr_source = ast.get_source_segment(self.source, node) or ''
            line = getattr(node, 'lineno', -1)
            new_node = ast.Call(
                func=ast.Name(id='trace_expr', ctx=ast.Load()),
                args=[node, ast.Constant(line), ast.Constant(expr_source)],
                keywords=[]
            )
            return ast.copy_location(new_node, node)
        return node


def instrument_code(code, script_path):
    tree = ast.parse(code, filename=script_path, mode='exec')
    tree = ExprTracer(code).visit(tree)
    ast.fix_missing_locations(tree)
    return tree


def main(script_path):
    global traces
    traces = []
    with open(script_path, 'r') as f:
        code = f.read()
    stdout_buffer = io.StringIO()
    sys.stdout = stdout_buffer
    sys.settrace(tracefunc)
    status = 'ok'
    error = ''
    try:
        tree = instrument_code(code, script_path)
        global_env = {'trace_expr': trace_expr}
        exec(compile(tree, script_path, 'exec'), global_env, global_env)
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
