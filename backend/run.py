from app import create_app
from app.startup import run_startup_checks

app = create_app()
run_startup_checks(app)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)