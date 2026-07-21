import React from 'react';

const SkeletonPost = () => {
    return (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100/50 mb-4 animate-pulse">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-100 rounded w-16"></div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-2 mb-4 mt-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>

            {/* Image Placeholder */}
            <div className="w-full h-48 sm:h-64 bg-gray-100 rounded-xl mb-4"></div>

            {/* Action Bar */}
            <div className="flex gap-4 pt-3 border-t border-gray-50">
                <div className="h-8 w-16 bg-gray-100 rounded-full"></div>
                <div className="h-8 w-16 bg-gray-100 rounded-full"></div>
                <div className="h-8 w-16 bg-gray-100 rounded-full"></div>
            </div>
        </div>
    );
};

export default SkeletonPost;
