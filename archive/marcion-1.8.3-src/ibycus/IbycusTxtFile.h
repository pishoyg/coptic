/*
 * IbycusTxtFile.h: IbycusTxtFile class --
 *    Interface to a TLG/PHI .TXT file
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
 * $Revision: 1.7 $
 * $Date: 2001/10/11 22:12:35 $
 * $Author: seanredmond $
*/

#ifndef	_IBYCUSTXTFILE_H_
#define _IBYCUSTXTFILE_H_

#include "IbycusDefs.h"
#include "IbycusTxtLine.h"
#include "IbycusIdt.h"
#include "IbycusFileException.h"

__IBYCUS_BEGIN_NAMESPACE
class IbycusTxtFile
{
public:
	enum read_state {
		not_ready,
		ready,
		beginning_of_section,
		end_of_section,
		end_of_work,
		end_of_author
	};

	IbycusTxtFile() throw(IbycusFileException) :
		CurrentAuth_(0),
		CurrentWork_(0),
		CurrentSection_(0),
		CurrentBlockOffset_(0),
		State_(not_ready)
		{};
	IbycusTxtFile(const ibystring_t & id, const ibystring_t & vol) throw(IbycusFileException);
	~IbycusTxtFile();

	bool Top(const int auth=0, const int work=0, const int sect=0) throw(IbycusException);
	bool Start(const int auth=0, const int work=0, const int sect=0) throw(IbycusException);
	bool Next() throw(IbycusException, IbycusParseException);
	//bool Next() throw(IbycusException, IbycusParseException);
	void Goto(const IbycusId & target) throw(IbycusNoId);
        const ibystring_t & Text() const throw(){
            return CurrentLine_.Text();}
        const IbycusId & Id() const throw(){
                return CurrentLine_.Id();}
        const ibystring_t & Filename() const throw(){
            return Filename_;}
        int Count(const int auth = -1, const int work = -1){
            return Idt_.Count(auth, work);}
        const ibystring_t & Name(const int auth = 0, const int work = -1){
            return Idt_.Name(auth, work);}
        IbycusIdtFile * Idt() throw(){
            return & Idt_;}
	ibystring_t StripCodes() const throw();
        bool eos() const{
            return Id() > CurrentEos_ || Id().Flag() == IbycusId::ENDOFFILE;}
        bool eow() const{
            return Id() > CurrentEow_ || Id().Flag() == IbycusId::ENDOFFILE;}
        bool eoa() const{
            return Id() > CurrentEoa_ || Id().Flag() == IbycusId::ENDOFFILE;}
        const IbycusId & EndId(int auth=0, int work=-1, int section = -1);
        const IbycusId & StartId(int auth=0, int work=-1, int section = -1);

private:
	void get_first_line() throw(IbycusException, IbycusParseException);
	bool goto_block(ibylen_t block);

	enum {block_size = 0x2000};
	int CurrentAuth_, CurrentWork_, CurrentSection_;
	ibylen_t CurrentBlockOffset_;
	read_state State_;
	ibystring_t Filename_;
	IbycusIdtFile Idt_;
	ibyIdFile Txt_;
	ibyTxtLine CurrentLine_;
	IbycusId CurrentStartId_, CurrentEos_, CurrentEow_, CurrentEoa_;

};


__IBYCUS_END_NAMESPACE
#endif	/* Not _IBYCUSTXTFILE_H_ */

/*
TODO:
-----------
Update Current*_ as Next() crosses from one section, work to the next
*/
