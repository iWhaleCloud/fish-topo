/* eslint-disable no-constant-condition */
/* eslint-disable no-fallthrough */
// Use timsort because in most case elements are partially sorted
// https://jsfiddle.net/pissang/jr4x7mdm/8/
// https://github.com/mziccard/node-timsort
let DEFAULT_MIN_MERGE = 32;
let DEFAULT_MIN_GALLOPING = 7;

function minRunLength(n) {
    let r = 0;

    while (n >= DEFAULT_MIN_MERGE) {
        r |= n & 1;
        n >>= 1;
    }

    return n + r;
}

function makeAscendingRun(array, lo, hi, compare) {
    let runHi = lo + 1;

    if (runHi === hi) {
        return 1;
    }

    if (compare(array[runHi++], array[lo]) < 0) {
        while (runHi < hi && compare(array[runHi], array[runHi - 1]) < 0) {
            runHi++;
        }

        reverseRun(array, lo, runHi);
    }
    else {
        while (runHi < hi && compare(array[runHi], array[runHi - 1]) >= 0) {
            runHi++;
        }
    }

    return runHi - lo;
}

function reverseRun(array, lo, hi) {
    hi--;

    while (lo < hi) {
        let t = array[lo];
        array[lo++] = array[hi];
        array[hi--] = t;
    }
}

function binaryInsertionSort(array, lo, hi, start, compare) {
    if (start === lo) {
        start++;
    }

    for (; start < hi; start++) {
        let pivot = array[start];

        let left = lo;
        let right = start;
        let mid;

        while (left < right) {
            mid = left + right >>> 1;

            if (compare(pivot, array[mid]) < 0) {
                right = mid;
            }
            else {
                left = mid + 1;
            }
        }

        let n = start - left;

        switch (n) {
            case 3:
                array[left + 3] = array[left + 2];//FIXME:fix this ugly code
            case 2:
                array[left + 2] = array[left + 1];//FIXME:fix this ugly code
            case 1:
                array[left + 1] = array[left];
                break;
            default:
                while (n > 0) {
                    array[left + n] = array[left + n - 1];
                    n--;
                }
        }

        array[left] = pivot;
    }
}

function gallopLeft(value, array, start, length, hint, compare) {
    let lastOffset = 0;
    let maxOffset = 0;
    let offset = 1;

    if (compare(value, array[start + hint]) > 0) {
        maxOffset = length - hint;

        while (offset < maxOffset && compare(value, array[start + hint + offset]) > 0) {
            lastOffset = offset;
            offset = (offset << 1) + 1;

            if (offset <= 0) {
                offset = maxOffset;
            }
        }

        if (offset > maxOffset) {
            offset = maxOffset;
        }

        lastOffset += hint;
        offset += hint;
    }
    else {
        maxOffset = hint + 1;
        while (offset < maxOffset && compare(value, array[start + hint - offset]) <= 0) {
            lastOffset = offset;
            offset = (offset << 1) + 1;

            if (offset <= 0) {
                offset = maxOffset;
            }
        }
        if (offset > maxOffset) {
            offset = maxOffset;
        }

        let tmp = lastOffset;
        lastOffset = hint - offset;
        offset = hint - tmp;
    }

    lastOffset++;
    while (lastOffset < offset) {
        let m = lastOffset + (offset - lastOffset >>> 1);

        if (compare(value, array[start + m]) > 0) {
            lastOffset = m + 1;
        }
        else {
            offset = m;
        }
    }
    return offset;
}

function gallopRight(value, array, start, length, hint, compare) {
    let lastOffset = 0;
    let maxOffset = 0;
    let offset = 1;

    if (compare(value, array[start + hint]) < 0) {
        maxOffset = hint + 1;

        while (offset < maxOffset && compare(value, array[start + hint - offset]) < 0) {
            lastOffset = offset;
            offset = (offset << 1) + 1;

            if (offset <= 0) {
                offset = maxOffset;
            }
        }

        if (offset > maxOffset) {
            offset = maxOffset;
        }

        let tmp = lastOffset;
        lastOffset = hint - offset;
        offset = hint - tmp;
    }
    else {
        maxOffset = length - hint;

        while (offset < maxOffset && compare(value, array[start + hint + offset]) >= 0) {
            lastOffset = offset;
            offset = (offset << 1) + 1;

            if (offset <= 0) {
                offset = maxOffset;
            }
        }

        if (offset > maxOffset) {
            offset = maxOffset;
        }

        lastOffset += hint;
        offset += hint;
    }

    lastOffset++;

    while (lastOffset < offset) {
        let m = lastOffset + (offset - lastOffset >>> 1);

        if (compare(value, array[start + m]) < 0) {
            offset = m;
        }
        else {
            lastOffset = m + 1;
        }
    }

    return offset;
}

function TimSort(array, compare) {
    let minGallop = DEFAULT_MIN_GALLOPING;
    let runStart=[];
    let runLength=[];
    let stackSize = 0;
    let tmp = [];

    function pushRun(_runStart, _runLength) {
        runStart[stackSize] = _runStart;
        runLength[stackSize] = _runLength;
        stackSize += 1;
    }

    function mergeRuns() {
        while (stackSize > 1) {
            let n = stackSize - 2;

            if (
                (n >= 1 && runLength[n - 1] <= runLength[n] + runLength[n + 1])
                || (n >= 2 && runLength[n - 2] <= runLength[n] + runLength[n - 1])
            ) {
                if (runLength[n - 1] < runLength[n + 1]) {
                    n--;
                }
            }
            else if (runLength[n] > runLength[n + 1]) {
                break;
            }
            mergeAt(n);
        }
    }

    function forceMergeRuns() {
        while (stackSize > 1) {
            let n = stackSize - 2;

            if (n > 0 && runLength[n - 1] < runLength[n + 1]) {
                n--;
            }

            mergeAt(n);
        }
    }

    function mergeAt(i) {
        let start1 = runStart[i];
        let length1 = runLength[i];
        let start2 = runStart[i + 1];
        let length2 = runLength[i + 1];

        runLength[i] = length1 + length2;

        if (i === stackSize - 3) {
            runStart[i + 1] = runStart[i + 2];
            runLength[i + 1] = runLength[i + 2];
        }

        stackSize--;

        let k = gallopRight(array[start2], array, start1, length1, 0, compare);
        start1 += k;
        length1 -= k;

        if (length1 === 0) {
            return;
        }

        length2 = gallopLeft(array[start1 + length1 - 1], array, start2, length2, length2 - 1, compare);

        if (length2 === 0) {
            return;
        }

        if (length1 <= length2) {
            mergeLow(start1, length1, start2, length2);
        }
        else {
            mergeHigh(start1, length1, start2, length2);
        }
    }

    function mergeLow(start1, length1, start2, length2) {
        let i = 0;

        for (i = 0; i < length1; i++) {
            tmp[i] = array[start1 + i];
        }

        let cursor1 = 0;
        let cursor2 = start2;
        let dest = start1;

        array[dest++] = array[cursor2++];

        if (--length2 === 0) {
            for (i = 0; i < length1; i++) {
                array[dest + i] = tmp[cursor1 + i];
            }
            return;
        }

        if (length1 === 1) {
            for (i = 0; i < length2; i++) {
                array[dest + i] = array[cursor2 + i];
            }
            array[dest + length2] = tmp[cursor1];
            return;
        }

        let _minGallop = minGallop;
        let count1;
        let count2;
        let exit;

        while (true) {
            count1 = 0;
            count2 = 0;
            exit = false;

            do {
                if (compare(array[cursor2], tmp[cursor1]) < 0) {
                    array[dest++] = array[cursor2++];
                    count2++;
                    count1 = 0;

                    if (--length2 === 0) {
                        exit = true;
                        break;
                    }
                }
                else {
                    array[dest++] = tmp[cursor1++];
                    count1++;
                    count2 = 0;
                    if (--length1 === 1) {
                        exit = true;
                        break;
                    }
                }
            } while ((count1 | count2) < _minGallop);

            if (exit) {
                break;
            }

            do {
                count1 = gallopRight(array[cursor2], tmp, cursor1, length1, 0, compare);

                if (count1 !== 0) {
                    for (i = 0; i < count1; i++) {
                        array[dest + i] = tmp[cursor1 + i];
                    }

                    dest += count1;
                    cursor1 += count1;
                    length1 -= count1;
                    if (length1 <= 1) {
                        exit = true;
                        break;
                    }
                }

                array[dest++] = array[cursor2++];

                if (--length2 === 0) {
                    exit = true;
                    break;
                }

                count2 = gallopLeft(tmp[cursor1], array, cursor2, length2, 0, compare);

                if (count2 !== 0) {
                    for (i = 0; i < count2; i++) {
                        array[dest + i] = array[cursor2 + i];
                    }

                    dest += count2;
                    cursor2 += count2;
                    length2 -= count2;

                    if (length2 === 0) {
                        exit = true;
                        break;
                    }
                }
                array[dest++] = tmp[cursor1++];

                if (--length1 === 1) {
                    exit = true;
                    break;
                }

                _minGallop--;
            } while (count1 >= DEFAULT_MIN_GALLOPING || count2 >= DEFAULT_MIN_GALLOPING);

            if (exit) {
                break;
            }

            if (_minGallop < 0) {
                _minGallop = 0;
            }

            _minGallop += 2;
        }

        minGallop = _minGallop;

        minGallop < 1 && (minGallop = 1);

        if (length1 === 1) {
            for (i = 0; i < length2; i++) {
                array[dest + i] = array[cursor2 + i];
            }
            array[dest + length2] = tmp[cursor1];
        }
        else if (length1 === 0) {
            throw new Error();
            // throw new Error('mergeLow preconditions were not respected');
        }
        else {
            for (i = 0; i < length1; i++) {
                array[dest + i] = tmp[cursor1 + i];
            }
        }
    }

    function mergeHigh(start1, length1, start2, length2) {
        let i = 0;

        for (i = 0; i < length2; i++) {
            tmp[i] = array[start2 + i];
        }

        let cursor1 = start1 + length1 - 1;
        let cursor2 = length2 - 1;
        let dest = start2 + length2 - 1;
        let customCursor = 0;
        let customDest = 0;

        array[dest--] = array[cursor1--];

        if (--length1 === 0) {
            customCursor = dest - (length2 - 1);

            for (i = 0; i < length2; i++) {
                array[customCursor + i] = tmp[i];
            }

            return;
        }

        if (length2 === 1) {
            dest -= length1;
            cursor1 -= length1;
            customDest = dest + 1;
            customCursor = cursor1 + 1;

            for (i = length1 - 1; i >= 0; i--) {
                array[customDest + i] = array[customCursor + i];
            }

            array[dest] = tmp[cursor2];
            return;
        }

        let _minGallop = minGallop;

        while (true) {
            let count1 = 0;
            let count2 = 0;
            let exit = false;

            do {
                if (compare(tmp[cursor2], array[cursor1]) < 0) {
                    array[dest--] = array[cursor1--];
                    count1++;
                    count2 = 0;
                    if (--length1 === 0) {
                        exit = true;
                        break;
                    }
                }
                else {
                    array[dest--] = tmp[cursor2--];
                    count2++;
                    count1 = 0;
                    if (--length2 === 1) {
                        exit = true;
                        break;
                    }
                }
            } while ((count1 | count2) < _minGallop);

            if (exit) {
                break;
            }

            do {
                count1 = length1 - gallopRight(tmp[cursor2], array, start1, length1, length1 - 1, compare);

                if (count1 !== 0) {
                    dest -= count1;
                    cursor1 -= count1;
                    length1 -= count1;
                    customDest = dest + 1;
                    customCursor = cursor1 + 1;

                    for (i = count1 - 1; i >= 0; i--) {
                        array[customDest + i] = array[customCursor + i];
                    }

                    if (length1 === 0) {
                        exit = true;
                        break;
                    }
                }

                array[dest--] = tmp[cursor2--];

                if (--length2 === 1) {
                    exit = true;
                    break;
                }

                count2 = length2 - gallopLeft(array[cursor1], tmp, 0, length2, length2 - 1, compare);

                if (count2 !== 0) {
                    dest -= count2;
                    cursor2 -= count2;
                    length2 -= count2;
                    customDest = dest + 1;
                    customCursor = cursor2 + 1;

                    for (i = 0; i < count2; i++) {
                        array[customDest + i] = tmp[customCursor + i];
                    }

                    if (length2 <= 1) {
                        exit = true;
                        break;
                    }
                }

                array[dest--] = array[cursor1--];

                if (--length1 === 0) {
                    exit = true;
                    break;
                }

                _minGallop--;
            } while (count1 >= DEFAULT_MIN_GALLOPING || count2 >= DEFAULT_MIN_GALLOPING);

            if (exit) {
                break;
            }

            if (_minGallop < 0) {
                _minGallop = 0;
            }

            _minGallop += 2;
        }

        minGallop = _minGallop;

        if (minGallop < 1) {
            minGallop = 1;
        }

        if (length2 === 1) {
            dest -= length1;
            cursor1 -= length1;
            customDest = dest + 1;
            customCursor = cursor1 + 1;

            for (i = length1 - 1; i >= 0; i--) {
                array[customDest + i] = array[customCursor + i];
            }

            array[dest] = tmp[cursor2];
        }
        else if (length2 === 0) {
            throw new Error();
            // throw new Error('mergeHigh preconditions were not respected');
        }
        else {
            customCursor = dest - (length2 - 1);
            for (i = 0; i < length2; i++) {
                array[customCursor + i] = tmp[i];
            }
        }
    }

    this.mergeRuns = mergeRuns;
    this.forceMergeRuns = forceMergeRuns;
    this.pushRun = pushRun;
}

export default function sort(array, compare, lo, hi) {
    if (!lo) {
        lo = 0;
    }
    if (!hi) {
        hi = array.length;
    }

    let remaining = hi - lo;

    if (remaining < 2) {
        return;
    }

    let runLength = 0;

    if (remaining < DEFAULT_MIN_MERGE) {
        runLength = makeAscendingRun(array, lo, hi, compare);
        binaryInsertionSort(array, lo, hi, lo + runLength, compare);
        return;
    }

    let ts = new TimSort(array, compare);

    let minRun = minRunLength(remaining);

    do {
        runLength = makeAscendingRun(array, lo, hi, compare);
        if (runLength < minRun) {
            let force = remaining;
            if (force > minRun) {
                force = minRun;
            }

            binaryInsertionSort(array, lo, lo + force, lo + runLength, compare);
            runLength = force;
        }

        ts.pushRun(lo, runLength);
        ts.mergeRuns();

        remaining -= runLength;
        lo += runLength;
    } while (remaining !== 0);

    ts.forceMergeRuns();
}
