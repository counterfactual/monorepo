# CircleCI: Continuous Integration Notes

Currently the [`Dockerfile`](./images/build/Dockerfile) in this folder is being autobuilt by [Docker Hub](https://cloud.docker.com/u/counterfactual/repository/docker/counterfactual/circleci-environment/builds) on the `master` branch only and then used inside the [`config.yml`](./config.yml) tagged as `counterfactual/circleci-environment:latest`.

Here are the settings used when the autobuild was configured:

| Build Rule          	| Value                             	|
|---------------------	|-----------------------------------	|
| Source              	| master                            	|
| Docker Tag          	| latest                            	|
| Dockerfile Location 	| .circleci/images/build/Dockerfile 	|
| Build Context       	| /                                 	|
| Autobuild           	| True                              	|
| Build Caching       	| True                              	|
