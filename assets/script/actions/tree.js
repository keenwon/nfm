import Promise from 'bluebird';
import fetch from 'isomorphic-fetch';
import {
    TREE_REQUEST,
    TREE_REQUEST_SUCCESS,
    TREE_CONTROL
} from '../constants/actionTypes';

/**
 * 发出请求
 */
function requestTree(path) {
    return {
        type: TREE_REQUEST,
        currentPath: path
    }
}

/**
 * 请求成功
 */
function requestTreeSuccess(data, path) {
    return {
        type: TREE_REQUEST_SUCCESS,
        currentPath: path,
        data: data
    }
}

export function getTree(path = '/') {
    return dispatch => {
        dispatch(requestTree(path));

        // TODO: {"code":500,"massge":"EACCES: permission denied, scandir '/tmp/KSOutOfProcessFetcher.0.ppfIhqX0vjaTSb8AJYobDV7Cu68='"}

        Promise.all([
            fetch(`http://localhost:3010/api/v1/list?path=${path}&type=d`).then(response => response.json()),
            Promise.delay(500)
        ]).then(([data]) => {
            dispatch(requestTreeSuccess(data, path));
        });
    }
}

/**
 * 展开 & 折叠
 */
export function controlTree(path) {
    return {
        type: TREE_CONTROL,
        currentPath: path
    }
}