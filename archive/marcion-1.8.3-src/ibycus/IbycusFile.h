/*
 * IbycusFile.h: ibyFile class --
 *    Base class for libycus files
 *
 * Copyright (c) 2000  Sean Redmond
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *
 * $Revision: 1.6 $
 * $Date: 2001/10/11 21:46:42 $
 * $Author: seanredmond $
 */

#ifndef _IBYCUSFILE_H
#define _IBYCUSFILE_H

#include "IbycusDefs.h"
#include "IbycusException.h"
#define  HIGHBIT 0x80  // 10000000

__IBYCUS_BEGIN_NAMESPACE
class ibyFile : public ibyfile_t

{
public:
	ibyFile() : ibyfile_t() {};
	ibyFile(const char *s, ios::openmode mode = ios::in|ios::binary)
		: ibyfile_t(s, mode) {};
	void open(const char *s,ios::openmode mode = ios::in|ios::binary)
		{ ibyfile_t::open(s,mode); };
	virtual ~ibyFile() {};
        ibyFile & operator>>(ibychar_t & rhs){
            rhs = get();
            return *this;}
        ibyFile & operator>>(unsigned char & rhs){
            rhs = get();
            return *this;}
        ibyFile & operator>>(ibylen_t & rhs){
            rhs = (get() << 8) + get();
            return *this;}
        ibyFile & operator>>(ibystring_t & rhs);
        void GetLenString(ibystring_t & rhs){
            ibychar_t tmp[300];
            get(tmp, get()+1);
            rhs = tmp;
    }

	typedef unsigned int pos_type;
};

__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSFILE_H */
