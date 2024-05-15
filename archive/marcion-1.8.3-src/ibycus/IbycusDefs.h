
/*
 * IbycusDefs.h: Definitions for libycus classes.
 *
 * Copyright (c) 2000  Sean Redmond
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *
 * $Revision: 1.4 $
 * $Date: 2001/10/11 21:53:14 $
 * $Author: seanredmond $
 */

#ifndef	_IBYCUSDEFS_H_
#define _IBYCUSDEFS_H_


#if _MSC_VER >= 1000
	#pragma once
	#pragma warning( disable : 4786 )
#endif // _MSC_VER >= 1000

#define __IBYCUS_NO_NAMESPACES
// __IBYCUS_NO_NAMESPACES is a hook so that users can disable namespaces
// without having to edit library headers.
# ifdef __IBYCUS_NO_NAMESPACES
#   define __IBYCUS_BEGIN_NAMESPACE
#   define __IBYCUS_END_NAMESPACE
# else
#   define __IBYCUS_BEGIN_NAMESPACE namespace smr_ibycus {
#   define __IBYCUS_END_NAMESPACE }
# endif /* defined(__IBYCUS_NO_NAMESPACES) */


#include <stdio.h>
#include <string>
#include <fstream>
#include <vector>
#include <map>
#include <stdexcept>
//#include "IbycusString.h"
using namespace std;

__IBYCUS_BEGIN_NAMESPACE

typedef signed int ibylen_t;
typedef fstream ibyfile_t;
typedef char ibychar_t;
typedef basic_string<ibychar_t> ibystring_t;
//typedef basic_string<ibychar_t> ibystring_base;

typedef vector<ibystring_t> stringvec_t;


__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSDEFS_H_ */
