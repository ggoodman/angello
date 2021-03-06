var myModule = angular.module('Angello',
    [
        'ngRoute',
        'ngAnimate',
        'firebase',
        'ngMessages',
        'Angello.Common',
        'Angello.Dashboard',
        'Angello.Login',
        'Angello.Storyboard',
        'Angello.User'
    ]);

myModule.config(function ($routeProvider, $httpProvider, $provide) {
    var getCurrentUser = function (AuthModel, $location) {
        return AuthModel.getCurrentUser()
                .then(function (user) {
                    if (!user) $location.path('/login');
                });
    };

    $routeProvider
        .when('/', {
            templateUrl: 'src/angello/storyboard/tmpl/storyboard.html',
            controller: 'StoryboardCtrl',
            controllerAs: 'storyboard',
            resolve: {
                currentUser: getCurrentUser
            }
        })
        .when('/dashboard', {
            templateUrl: 'src/angello/dashboard/tmpl/dashboard.html',
            controller: 'DashboardCtrl',
            controllerAs: 'dashboard',
            resolve: {
                currentUser: getCurrentUser
            }
        })
        .when('/users', {
            templateUrl: 'src/angello/user/tmpl/users.html',
            controller: 'UsersCtrl',
            controllerAs: 'users',
            resolve: {
                currentUser: getCurrentUser
            }
        })
        .when('/users/:userId', {
            templateUrl: 'src/angello/user/tmpl/user.html',
            controller: 'UserCtrl',
            controllerAs: 'myUser',
            resolve: {
                currentUser: getCurrentUser,
                user: function ($route, $routeParams, UsersModel) {
                    var userId = $route.current.params['userId'] ? $route.current.params['userId'] : $routeParams['userId'];
                    return UsersModel.fetch(userId);
                },
                stories: function ($rootScope, StoriesModel) {
                    // On page refresh, this is getting fired before the userId is set,
                    // resulting in a null userId which in turn breaks the StoriesModel.all() http request. 
                    // Either the following code needs to be moved to the controller, or the StoriesModel.all()
                    // method needs to take a userId parameter that we can then set from the route params.

                    return StoriesModel.all();
                }
            }
        })
        .when('/login', {
            templateUrl: 'src/angello/login/tmpl/login.html',
            controller: 'LoginCtrl',
            controllerAs: 'login'
        })
        .otherwise({redirectTo: '/'});

    // Interceptor
    $httpProvider.interceptors.push('loadingInterceptor');
    $httpProvider.interceptors.push('requestInterceptor');


    // Decorator
    // Use the `decorator` solution to substitute or attach behaviors to
    // original service instance; @see angular-mocks for more examples....
    $provide.decorator('$log', function ($delegate) {
        // Save the original $log.debug()
        var debugFn = $delegate.debug;

        // TODO Extract this into a utility service
        function timeStamp() {
            // Create a date object with the current time
            var now = new Date();

            // Create an array with the current month, day and time
            var date = [ now.getMonth() + 1, now.getDate(), now.getFullYear() ];

            // Create an array with the current hour, minute and second
            var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];

            // Determine AM or PM suffix based on the hour
            var suffix = ( time[0] < 12 ) ? "AM" : "PM";

            // Convert hour from military time
            time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;

            // If hour is 0, set it to 12
            time[0] = time[0] || 12;

            // If seconds and minutes are less than 10, add a zero
            for (var i = 1; i < 3; i++) {
                if (time[i] < 10) {
                    time[i] = "0" + time[i];
                }
            }

            // Return the formatted string
            return date.join("/") + " " + time.join(":") + " " + suffix;
        }

        $delegate.debug = function () {
            // Prepend timestamp
            arguments[0] = timeStamp() + ' - ' + arguments[0];

            // Call the original with the output prepended with formatted timestamp
            debugFn.apply(null, arguments)
        };

        return $delegate;
    });
});

myModule.factory('loadingInterceptor', function (LoadingService) {
    var loadingInterceptor = {
        request: function (config) {
            LoadingService.setLoading(true);
            return config;
        },
        response: function (response) {
            LoadingService.setLoading(false);
            return response;
        }
    };
    return loadingInterceptor;
});

myModule.factory('requestInterceptor', function (UserService, CURRENT_BACKEND) {
    if (CURRENT_BACKEND !== 'firebase') {
        var requestInterceptor = {
            request: function (config) {
                var user = UserService.getCurrentUser();
                var access_token = user ? user.access_token : null;

                if(access_token) {
                  config.headers.authorization = access_token;
                }
                return config;
            }
        };
    } else {
        var requestInterceptor = {};
    }

    return requestInterceptor;
});

myModule.run(function ($rootScope, LoadingService) {
    $rootScope.$on('$routeChangeStart', function (e, curr, prev) {
        LoadingService.setLoading(true);
    });

    $rootScope.$on('$routeChangeSuccess', function (e, curr, prev) {
        LoadingService.setLoading(false);
    });
});

myModule.value('STORY_STATUSES', [
    {name: 'To Do'},
    {name: 'In Progress'},
    {name: 'Code Review'},
    {name: 'QA Review'},
    {name: 'Verified'}
]);

myModule.value('STORY_TYPES', [
    {name: 'Feature'},
    {name: 'Enhancement'},
    {name: 'Bug'},
    {name: 'Spike'}
]);

myModule.constant('Firebase', window.Firebase);