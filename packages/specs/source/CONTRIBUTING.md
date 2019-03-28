# Contributing

HTML files are built automatically by readthedocs. To build a local preview copy, a Makefile is provided that invokes sphinx. Install the dependencies and build a local preview by doing the following:

```shell
python3 -m venv venv
source venv/bin/activate
pip3 install -r requirements.txt
make html
```
