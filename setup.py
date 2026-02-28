from pathlib import Path

from setuptools import find_packages, setup


APP_NAME = "acentem_takipte"


def get_requirements():
    requirements = Path("requirements.txt").read_text(encoding="utf-8").splitlines()
    return [req.strip() for req in requirements if req.strip() and not req.startswith("#")]


setup(
    name=APP_NAME,
    version="0.0.1",
    description="Insurance agency CRM and policy tracking app",
    author="ABK",
    author_email="aykutburakk@gmail.com",
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=get_requirements(),
)
